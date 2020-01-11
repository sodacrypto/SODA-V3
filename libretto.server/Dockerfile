FROM librettolang/jetty-server AS servlet-generator
RUN	yum -y install unzip && mkdir -p /usr/src/distr/ROOT
COPY .  /usr/src/app
WORKDIR /usr/src
RUN java -Xss10m -Xmx16G -classpath "/usr/bin/libretto-run.jar"\
	org.librettolang.run.ServletGenerator app /usr/src/servlet.zip &&\
	unzip servlet.zip -d /usr/src/distr/ROOT && ls -l distr &&\
	mkdir -p /usr/src/distr/ROOT/WEB-INF/data/file 
COPY db /usr/src/distr/ROOT/WEB-INF/data/storage/main/db

FROM tomcat:jdk8-slim
RUN rm -R /usr/local/tomcat/webapps/*
COPY --from=servlet-generator /usr/src/distr /usr/local/tomcat/webapps
