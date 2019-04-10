%{

int lines=0, words=0,small_letter=0,capital_letter=0, num=0, special_char=0,total=0;
%}
%%
 
\n { lines++,words++;}
[\t ' '] words++;
[A-Z] capital_letter++;
[a-z] small_letter++;
[0-9] num++;
[^A-Za-z0-9 ] special_char++;
%%
 
int main(void) {
    yyin= fopen("input1.txt","r");
    yylex();
    total=small_letter+capital_letter+num+special_char;
    printf(" This File contains ...");
    printf("\n\t%d lines", lines);
    printf("\n\t%d words",words);
    printf("\n\t%d small letters", small_letter);
    printf("\n\t%d capital letters",capital_letter);
    printf("\n\t%d digits", num);
    printf("\n\t%d special characters",special_char);
    printf("\n\tIn total %d characters.\n",total);
}
 
int yywrap() {
return(1);
}

